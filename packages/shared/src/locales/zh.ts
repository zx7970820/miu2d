/**
 * 服务端中文翻译资源
 *
 * 仅包含服务端 getMessage() 实际用到的 errors.* 键。
 * 前端翻译使用 react-i18next，参见 ../i18n/index.ts
 */
export const zh = {
  translation: {
    errors: {
      common: {
        unauthorized: "未登录",
        forbidden: "无权限访问",
        notFound: "资源不存在",
        missingGame: "缺少游戏参数",
        gameForbidden: "无权限访问该游戏",
      },
      auth: {
        invalidCredentials: "账号或密码错误",
        defaultGameNotFound: "未找到默认游戏",
        emailAlreadyRegistered: "邮箱已注册",
      },
      user: {
        notFound: "用户不存在",
        emailInUse: "邮箱已被使用",
        wrongPassword: "当前密码不正确",
      },
      game: {
        notFound: "游戏不存在",
        onlyOwnerCanUpdate: "仅创建者可修改",
        onlyOwnerCanDelete: "仅创建者可删除",
        slugExists: "Slug 已存在",
        onlyOwnerCanTransfer: "仅创建者可转让所有权",
        newOwnerNotFound: "目标用户不存在",
      },
      file: {
        notFound: "文件或目录不存在",
        noAccess: "无权限访问该游戏的文件",
        nameConflict: "同名文件或目录已存在",
        parentNotFound: "目标目录不存在",
        parentNotFolder: "目标不是目录",
        cannotMoveToDescendant: "无法将目录移动到其子目录中",
        uploadNotComplete: "文件上传未完成",
        notAFile: "该项不是文件",
      },
      magic: {
        notFound: "武功不存在",
        fileNameConflict: "武功文件名已存在",
        invalidIniFormat: "INI 文件格式无效",
      },
      scene: {
        notFound: "场景不存在",
        itemNotFound: "场景子项不存在",
        keyConflict: "场景标识已存在",
      },
      goods: {
        notFound: "物品不存在",
      },
      npc: {
        notFound: "NPC 不存在",
      },
      obj: {
        notFound: "物件不存在",
      },
    },
  },
};

export type TranslationSchema = typeof zh;
