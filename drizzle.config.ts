import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { parse } from "pg-connection-string";

const { database, host, port, password, user } = parse(process.env.DB_URL!);

let config = defineConfig({
  out: "./src/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // using url doesn't work because it seems to override the ssl config
    // url: process.env.DB_URL!,
    host: host!,
    port: parseInt(port!),
    user: user!,
    password: password!,
    database: database!,
    ssl: {
      ca: process.env.DB_CERT,
    },
  },
});

// if (process.env.SEED) {
//   console.log("Seeding mode - using local database");
//   // define a push based schema, so that the pulled production schema can be applied to the local db
//   config = defineConfig({
//     dialect: "postgresql",
//     schema: "./app/drizzle/schema.ts",
//     out: "./app/drizzle",
//     dbCredentials: {
//       url: process.env.WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE!,
//     },
//   });
// }

export default config;
