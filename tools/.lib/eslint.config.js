import crossFolderApi from "./eslint/rules/cross-folder-api.js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/**", ".bin/**", ".lib/**", "homepage/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true
      }
    },
    plugins: {
      "dotfiles-tools": {
        rules: {
          "cross-folder-api": crossFolderApi
        }
      }
    },
    rules: {
      "dotfiles-tools/cross-folder-api": "error"
    }
  }
);
