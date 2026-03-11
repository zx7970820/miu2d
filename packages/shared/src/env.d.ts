interface ImportMetaEnv {
  readonly VITE_DEMO_RESOURCES_DOMAIN?: string;
  /** S3/MinIO 公开访问基础 URL（含 bucket），如 /s3/miu2d 或 https://cdn.example.com/miu2d */
  readonly VITE_S3_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
