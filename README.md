## Structure
- `./src/clients`
  - "Clients" are isolated adapters to outside data connections (database, discord, cache, ...).
  - Keeping them separate allows you to quickly modify connection info and keep from polluting business logic (the primary goal of the app isn't to find the database).
  - `config` would make sense as a "client", too. The app as a whole doesn't really care how that's retrieved.
- `./src/index.ts`
  - Entry point
  - Very little logic. Gets the app started and gets out of the way. Also gracefully handles the app falling on its face.
  - Sharding will probably live here. Will be broken out a bit further since "one app" vs "many apps" are different concerns.
- `./src/utils.ts`
  - General dumping ground for the moment. When a lot of "date" or "number" utilities show up it makes sense to break them out into `utils/dates.ts` or whatever.
- `./src/models`
  - Stores interfaces and table names for all database tables.
- `./src/plugins`
  - Seems a bit silly at the moment, but when you start adding more features (gambling, chat ranking, whatever) this is where you'll add the different concerns.
  - Eventually you'll start noticing a pattern in how they're defined and be able to standardize it and make "plugin loading / settings" a configuration option so it's customizable.
    - Note: TypeScript comes in handy here. "Your plugin must implement `interface IPlugin { onMessage?: (message: Message) => Promise<void>... }`..."

## Tools
- [Prettier](https://prettier.io/) - Opinionated code formatter that ensures formatting is always consistent. It is set to run during commit (`package.json#husky`), so it does the work behind the scenes if you don't want to worry about it.
- [Yarn](https://classic.yarnpkg.com/) (Optional) - Alternative package manager to npm. In my experience, it handles package version locking better and is faster. Using `yarn` instead of `npm install` will read the `yarn.lock` file and use package versions from there.
- [TypeScript](https://www.typescriptlang.org/) - Adds types and other safety features to JavaScript. Added bonus of allowing the use of newer JavaScript features in Node and significantly improving development experience (better documentation on hover, "find all references", safer auto refactors, etc).
- [EditorConfig](https://editorconfig.org/) - Automatically configures indent spacing, end of line character, and other common settings for editors.
- [ESLint](https://eslint.org/) - Similar to TypeScript. Tells you when you're being stupid.
- [dotenv](https://www.npmjs.com/package/dotenv) - Configuration loader. Instead of hardcoding configuration values (database passwords, tokens, etc) it loads them from `.env` in the root of the project.
- [log4js](https://github.com/log4js-node/log4js-node) - Logging can get messy. This adds a layer of configurability to it (driven by `LOG_LEVEL`) so you can tweak the amount of output without modifying code. Can also have it output to multiple, different locations (files, log aggregators, console, ...).
- [knex](http://knexjs.org/) - SQL Builder that adds safety and TypeScript support so you don't have to worry about it.

