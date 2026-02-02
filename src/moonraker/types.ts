export interface FileInfo {
  filename: string;
  modified: number; // Unix timestamp
  size: number;
  permissions: string;
}

export interface DirectoryEntry {
  dirname: string;
  modified: number;
  size: number;
  permissions: string;
}

export interface DirectoryInfo {
  dirs: DirectoryEntry[];
  files: FileInfo[];
  disk_usage: {
    total: number;
    used: number;
    free: number;
  };
  root_info: {
    name: string;
    permissions: string;
  };
}

export interface UploadResult {
  item: {
    path: string;
    root: string;
    modified: number;
    size: number;
    permissions: string;
  };
  action: string;
}

export interface RootInfo {
  name: string;
  path: string;
  permissions: string;
}
