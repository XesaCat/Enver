import { appendFileSync, existsSync, mkdirSync } from "fs";
import { Enver } from "../src/index";
import type { EnverConfig } from "../src/index";
import { config as loadEnv } from "dotenv";

const validEnverConfig: EnverConfig = {
    configEntries: [
        {
            default: "info",
            description: "The required level for a message to be logged",
            importance: "error",
            name: "LOGLEVEL",
            options: "silly | trace | debug | info | warn | error | fatal",
            title: "Log level",
        },
    ],
    file: "production.env",
};

jest.mock("fs");
jest.mock("dotenv");

const env = process.env;
afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    process.env = env;
});

describe("initConfig", () => {
    it("should create folder if not exists", () => {
        (existsSync as jest.Mock).mockReturnValue(false);

        new Enver(validEnverConfig).initConfig();

        expect(mkdirSync).toBeCalledTimes(1);
    });

    it("should throw if file exists", () => {
        (existsSync as jest.Mock).mockImplementation(() => true);

        expect(() => new Enver(validEnverConfig).initConfig()).toThrowError("File already exists");
    });

    it("should create file if not exists", () => {
        (existsSync as jest.Mock).mockReturnValue(false);

        new Enver(validEnverConfig).initConfig();

        expect(appendFileSync).toBeCalledTimes(validEnverConfig.configEntries.length + 1);
    });

    describe("arguments check", () => {
        it("should throw if no entries are given", () => {
            (existsSync as jest.Mock).mockReturnValue(false);

            function testFunction(): unknown {
                return new Enver({ configEntries: [], file: validEnverConfig.file }).initConfig();
            }

            expect(testFunction).toThrowError("No entries given");
        });

        it("should throw on invalid filename", () => {
            function testFunction(): unknown {
                return new Enver({
                    configEntries: validEnverConfig.configEntries,
                    file: ".env.Production",
                });
            }

            expect(testFunction).toThrowError("Filename must only have lowercase letters and end with .env");
        });

        it("should throw on invalid 'title'", () => {
            function testFunction(): unknown {
                return new Enver({
                    configEntries: [
                        {
                            ...validEnverConfig.configEntries[0],
                            title: "7357 717L3",
                        },
                    ],
                    file: validEnverConfig.file,
                }).initConfig();
            }

            expect(testFunction).toThrowError("Invalid value for 'title'. May only have letters and spaces.");
        });

        it("should throw on invalid 'name'", () => {
            function testFunction(): unknown {
                return new Enver({
                    configEntries: [
                        {
                            ...validEnverConfig.configEntries[0],
                            name: "log.level",
                        },
                    ],
                    file: validEnverConfig.file,
                }).initConfig();
            }

            expect(testFunction).toThrowError(
                "Invalid value for 'name'. May only have uppercase letters and underscores",
            );
        });

        it("should throw on duplicated entry", () => {
            (existsSync as jest.Mock).mockReturnValue(false);

            function testFunction(): unknown {
                return new Enver({
                    configEntries: [validEnverConfig.configEntries[0], validEnverConfig.configEntries[0]],
                    file: validEnverConfig.file,
                }).initConfig();
            }

            expect(() => testFunction()).toThrowError(`Duplicate entry '${validEnverConfig.configEntries[0].name}'`);
        });

        it("should throw if entry is already set", () => {
            (existsSync as jest.Mock).mockReturnValue(false);

            process.env = { ...env, LOGLEVEL: "info" };

            expect(() => new Enver(validEnverConfig).initConfig()).toThrowError(
                `Entry '${validEnverConfig.configEntries[0].name}' is already set in process.env`,
            );
        });
    });
});

describe("loadConfig", () => {
    it("should check if file exists", () => {
        (existsSync as jest.Mock).mockReturnValue(true);

        new Enver(validEnverConfig).loadConfig();

        expect(existsSync).toBeCalledTimes(1);
    });

    it("should throw if file doesn't exist", () => {
        (existsSync as jest.Mock).mockReturnValue(false);

        expect(() => new Enver(validEnverConfig).loadConfig()).toThrowError("File not found");
    });

    describe("should load config", () => {
        test("normal", () => {
            (existsSync as jest.Mock).mockReturnValue(true);

            new Enver(validEnverConfig).loadConfig();

            expect(loadEnv).toBeCalledTimes(1);
        });
        test("fallback", () => {
            (existsSync as jest.Mock).mockReturnValue(false);
            (existsSync as jest.Mock).mockReturnValue(true);

            new Enver({
                ...validEnverConfig,
                fallback: "fallback.env",
            }).loadConfig();

            expect(loadEnv).toBeCalledTimes(1);
        });
    });

    describe("should load fallback if needed", () => {
        test("load", () => {
            (existsSync as jest.Mock).mockReturnValueOnce(false);
            (existsSync as jest.Mock).mockResolvedValueOnce(true);

            new Enver({
                ...validEnverConfig,
                fallback: "fallback.env",
            }).loadConfig();
            expect(existsSync).toBeCalledTimes(2);
            expect(loadEnv).toBeCalledTimes(1);
        });

        test("warn", () => {
            (existsSync as jest.Mock).mockReturnValueOnce(false);
            (existsSync as jest.Mock).mockReturnValueOnce(true);

            const logger = jest.fn();

            new Enver({
                ...validEnverConfig,
                fallback: "fallback.env",
                logger: {
                    warn: logger,
                },
            }).loadConfig();

            expect(logger).toBeCalledWith(
                `Couldn't find config/${validEnverConfig.file}. Falling back to config/fallback.env`,
            );
        });
    });

    describe("config check", () => {
        const logger = jest.fn();
        const invalidLogger = jest.fn();

        describe("verified", () => {
            const loggers = {
                error: invalidLogger,
                info: logger,
                warn: invalidLogger,
            };

            it("should inform", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                process.env = { ...env, LOGLEVEL: "info" };

                new Enver({
                    ...validEnverConfig,
                    logger: loggers,
                }).loadConfig();

                expect(logger).toBeCalledWith("Verified config");
                expect(invalidLogger).not.toBeCalled();
            });

            it("should return correct values", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                process.env = { ...env, LOGLEVEL: "info" };

                function testFunction(): unknown {
                    return new Enver({
                        ...validEnverConfig,
                        logger: loggers,
                    }).loadConfig();
                }

                expect(testFunction()).toEqual({ errors: 0, ignored: 0, warnings: 0 });
            });
        });

        describe("verified with ignored", () => {
            const loggers = {
                error: invalidLogger,
                info: logger,
                warn: invalidLogger,
            };

            it("should inform", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                function testFunction(): unknown {
                    return new Enver({
                        configEntries: [
                            {
                                ...validEnverConfig.configEntries[0],
                                importance: "ignore",
                            },
                        ],
                        file: validEnverConfig.file,
                        logger: loggers,
                    }).loadConfig();
                }

                expect(testFunction()).toEqual({ errors: 0, ignored: 1, warnings: 0 });
            });
            it("should return correct values", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                new Enver({
                    configEntries: [
                        {
                            ...validEnverConfig.configEntries[0],
                            importance: "ignore",
                        },
                    ],
                    file: validEnverConfig.file,
                    logger: loggers,
                }).loadConfig();

                expect(logger).toBeCalledWith(
                    `In config/${validEnverConfig.file}: Property '${validEnverConfig.configEntries[0].name}' is missing`,
                );
                expect(logger).toBeCalledWith("Verified config. 1 ignored");
                expect(invalidLogger).not.toBeCalled();
            });
        });

        describe("verified with warnings", () => {
            const loggers = {
                error: invalidLogger,
                info: invalidLogger,
                warn: logger,
            };

            it("should warn", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                new Enver({
                    configEntries: [
                        {
                            ...validEnverConfig.configEntries[0],
                            importance: "warn",
                        },
                    ],
                    file: validEnverConfig.file,
                    logger: loggers,
                }).loadConfig();

                expect(logger).toBeCalledWith("Verified config. 1 warnings, 0 ignored");
                expect(logger).toBeCalledWith(
                    `In config/${validEnverConfig.file}: Property '${validEnverConfig.configEntries[0].name}' is missing`,
                );
                expect(invalidLogger).not.toBeCalled();
            });
            it("should return correct values", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                function testFunction(): unknown {
                    return new Enver({
                        configEntries: [
                            {
                                ...validEnverConfig.configEntries[0],
                                importance: "warn",
                            },
                        ],
                        file: validEnverConfig.file,
                        logger: loggers,
                    }).loadConfig();
                }

                expect(testFunction()).toEqual({ errors: 0, ignored: 0, warnings: 1 });
            });
        });

        describe("failed to verify", () => {
            const loggers = {
                error: logger,
                info: invalidLogger,
                warn: invalidLogger,
            };

            it("should error", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                new Enver({
                    configEntries: [
                        {
                            ...validEnverConfig.configEntries[0],
                            importance: "error",
                        },
                    ],
                    file: validEnverConfig.file,
                    logger: loggers,
                }).loadConfig();

                expect(logger).toBeCalledWith("Failed to verify config. 1 error, 0 warnings, 0 ignored");
                expect(logger).toBeCalledWith(
                    `In config/${validEnverConfig.file}: Property '${validEnverConfig.configEntries[0].name}' is missing`,
                );
                expect(invalidLogger).not.toBeCalled();
            });
            it("should return correct values", () => {
                (existsSync as jest.Mock).mockReturnValue(true);

                function testFunction(): unknown {
                    return new Enver({
                        configEntries: [
                            {
                                ...validEnverConfig.configEntries[0],
                                importance: "error",
                            },
                        ],
                        file: validEnverConfig.file,
                        logger: loggers,
                    }).loadConfig();
                }

                expect(testFunction()).toEqual({ errors: 1, ignored: 0, warnings: 0 });
            });
        });
    });
});
