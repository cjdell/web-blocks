import path from "node:path";
import { fileURLToPath } from "node:url";

// In Node.js versions prior to native support for import.meta.dirname,
// derive __dirname from import.meta.url.
// (Node 20.11+ supports import.meta.dirname and import.meta.filename.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  devtool: "source-map",
  // P3.9: webpack's default 244 KiB asset limit is calibrated for typical
  // apps, not for a three.js + React WebGL bundle (app.js is ~747 KiB raw /
  // ~195 KiB post-gzip, mostly three + react-dom). The real budget is
  // post-gzip and is enforced by `yarn size` (size.ts); these raw limits
  // only trip on genuine bloat well beyond the P3.9 baseline, so the build
  // is warning-clean.
  performance: {
    maxAssetSize: 800 * 1024,
    maxEntrypointSize: 800 * 1024,
  },
  entry: {
    app: "./app/App.ts",
    worker: "./worker/GeometryWorker.ts",
    style: "./css/app.less",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            // Only type-check files that are actually bundled; the whole
            // project (including test/) is still checked by `yarn typecheck`.
            onlyCompileBundledFiles: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.less$/i,
        use: [
          "style-loader",
          "css-loader",
          "less-loader",
        ],
      },
      {
        test: /samples\/*\.js/,
        type: "asset/inline",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
    clean: true,
  },
};
