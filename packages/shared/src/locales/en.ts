/**
 * 服务端英文翻译资源
 *
 * 仅包含服务端 getMessage() 实际用到的 errors.* 键。
 * 前端翻译使用 react-i18next，参见 ../i18n/index.ts
 */
import type { TranslationSchema } from "./zh.js";

export const en: TranslationSchema = {
  translation: {
    errors: {
      common: {
        unauthorized: "Not logged in",
        forbidden: "No permission to access",
        notFound: "Resource not found",
        missingGame: "Missing game parameter",
        gameForbidden: "No permission to access this game",
      },
      auth: {
        invalidCredentials: "Invalid email or password",
        defaultGameNotFound: "Default game not found",
        emailAlreadyRegistered: "Email already registered",
      },
      user: {
        notFound: "User not found",
        emailInUse: "Email already in use",
        wrongPassword: "Current password is incorrect",
      },
      game: {
        notFound: "Game not found",
        onlyOwnerCanUpdate: "Only the owner can update",
        onlyOwnerCanDelete: "Only the owner can delete",
        slugExists: "Slug already exists",
        onlyOwnerCanTransfer: "Only the owner can transfer ownership",
        newOwnerNotFound: "Target user not found",
      },
      file: {
        notFound: "File or folder not found",
        noAccess: "No permission to access files in this game",
        nameConflict: "A file or folder with this name already exists",
        parentNotFound: "Target folder not found",
        parentNotFolder: "Target is not a folder",
        cannotMoveToDescendant: "Cannot move a folder into its own subfolder",
        uploadNotComplete: "File upload not complete",
        notAFile: "This item is not a file",
      },
      magic: {
        notFound: "Magic skill not found",
        fileNameConflict: "Magic file name already exists",
        invalidIniFormat: "Invalid INI file format",
      },
      scene: {
        notFound: "Scene not found",
        itemNotFound: "Scene item not found",
        keyConflict: "Scene key already exists",
      },
      goods: {
        notFound: "Item not found",
      },
      npc: {
        notFound: "NPC not found",
      },
      obj: {
        notFound: "Object not found",
      },
    },
  },
};
