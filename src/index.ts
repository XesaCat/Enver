import { appendFileSync, existsSync, mkdirSync } from "fs";
import { env } from "process";
import { config as loadEnv } from "dotenv";

export interface ConfigEntry {
    default?: string;
    description: string;
    importance: "ignore" | "warn" | "error";
    name: string;
    options: string;
    title: string;
}

export interface EnverConfig {
    configEntries: ConfigEntry[];
    fallback?: string;
    file: string;
    logger?: Logger;
}

export interface Logger {
    error?: (message: string) => unknown;
    info?: (message: string) => unknown;
    warn?: (message: string) => unknown;
}

export class Enver {
    private configEntries: ConfigEntry[];
    private fallback?: string;
    private file: string;
    private logger?: Logger;

    public constructor(config: EnverConfig) {
        this.configEntries = config.configEntries;
        this.fallback = config.fallback;
        this.file = config.file;
        this.logger = config.logger;

        if (!this.file.match(/[a-z]\.env$/))
            throw new Error("Filename must only have lowercase letters and end with .env");
    }

    public initConfig(): void {
        if (!existsSync("config/")) mkdirSync("config/");
        if (existsSync(`config/${this.file}`)) throw new Error("File already exists");

        if (!this.configEntries.length) throw new Error("No entries given");

        const seenEntryNames: string[] = [];
        this.configEntries.forEach((entry) => {
            if (!entry.name.match(/[A-Z_]+/))
                throw new Error("Invalid value for 'name'. May only have uppercase letters and underscores");
            if (seenEntryNames.includes(entry.name)) throw new Error(`Duplicate entry '${entry.name}'`);
            if (env[entry.name]) throw new Error(`Entry '${entry.name}' is already set in process.env`);
            seenEntryNames.push(entry.name);
        });

        appendFileSync(
            `config/${this.file}`,
            "# Title\n" +
                "# description: Description\n" +
                "# required   : no | warn | fatal\n" +
                "# default    : default value\n" +
                "# options    : possible values\n" +
                "# SOME_VARIABLE=some-value\n\n",
        );

        this.configEntries.forEach((entry) => {
            appendFileSync(
                `config/${this.file}`,
                `# ${entry.title}\n` +
                    `# description: ${entry.description}\n` +
                    `# required   : ${entry.importance}\n` +
                    `# default    : ${entry.default || "<none>"}\n` +
                    `# options    : ${entry.options}\n` +
                    `${entry.name}=${entry.default || ""}\n\n`,
            );
        });
    }

    public loadConfig(): { errors: number; ignored: number; warnings: number } {
        if (existsSync(`config/${this.file}`)) {
            loadEnv({ path: `config/${this.file}` });
        } else if (this.fallback && existsSync(`config/${this.fallback}`)) {
            loadEnv({ path: `config/${this.fallback}` });
            if (this.logger?.warn)
                this.logger.warn(`Couldn't find config/${this.file}. Falling back to config/${this.fallback}`);
        } else if (this.fallback) {
            throw new Error("Fallback file not found");
        } else {
            throw new Error("File not found");
        }

        let errors = 0;
        let ignored = 0;
        let warnings = 0;

        const missing = (entryName: string): string => {
            return `In config/${this.file}: Property '${entryName}' is missing`;
        };

        this.configEntries.forEach((entry) => {
            if (!env[entry.name]) {
                if (entry.importance === "error") {
                    if (this.logger?.error) this.logger.error(missing(entry.name));
                    errors++;
                } else if (entry.importance === "warn") {
                    if (this.logger?.warn) this.logger.warn(missing(entry.name));
                    warnings++;
                } else if (entry.importance === "ignore") {
                    if (this.logger?.info) this.logger.info(missing(entry.name));
                    ignored++;
                }
            }
        });

        if (this.logger?.error && errors > 0) {
            this.logger.error(`Failed to verify config. ${errors} error, ${warnings} warnings, ${ignored} ignored`);
        } else if (this.logger?.warn && warnings > 0) {
            this.logger.warn(`Verified config. ${warnings} warnings, ${ignored} ignored`);
        } else if (this.logger?.info && ignored > 0) {
            this.logger.info(`Verified config. ${ignored} ignored`);
        } else if (this.logger?.info) {
            this.logger.info("Verified config");
        }

        return { errors, ignored, warnings };
    }
}
