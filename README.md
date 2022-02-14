# Enver

Enver is a tool for typescript to automatically create and load .env files from a scheme

## Examples

Example config:

```ts
{
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
    fallback: "production.conf",
    file: "development.env",
    logger: {
        info: myLogger.info,
        warn: myLogger.warn,
        error: myLogger.error,
    }
}
```

### Creating a config file

Use `initConfig` with the above configuration to create a file named `production.env` in `./config/`

```ts
import { Enver } from "enver";

const enver = new Enver({
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
    fallback: "production.conf",
    file: "development.env",
}).initConfig();
```

### Output:

```cs
# Title
# description: Description
# required   : no | warn | fatal
# default    : default value
# options    : possible values
# SOME_VARIABLE=some-value

# Log level
# description: The required level for a message to be logged
# required   : error
# default    : info
# options    : silly | trace | debug | info | warn | error | fatal
LOGLEVEL=info
```

### Loading config file

Use `loadConfig` to verify and load the variables in your config file into [`process.env`](https://nodejs.org/api/process.html#processenv)

```ts
const enver = new Enver({
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
    fallback: "production.env",
    file: "development.env",
    logger: {
        info: myLogger.info,
        warn: myLogger.warn,
        error: myLogger.error,
    },
}).loadConfig();
```

## Base class

### Methods

-   constructor(config: EnverConfig)
-   initConfig(): void
-   loadconfig(): { errors: number; ignored: number; warnings: number }

### Interfaces

#### ConfigEntry

```ts
interface ConfigEntry {
    default?: string;
    description: string;
    importance: "ignore" | "warn" | "error";
    name: string;
    options: string;
    title: string;
}
```

#### EnverConfig

```ts
interface EnverConfig {
    configEntries: ConfigEntry[];
    fallback?: string;
    file: string;
    logger?: Logger;
}
```

#### Logger

```ts
interface Logger {
    error?: (message: string) => unknown;
    warn?: (message: string) => unknown;
    info?: (message: string) => unknown;
}
```

## Dependencies

-   [dotenv](https://www.npmjs.com/package/dotenv)
