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

// Printer info from /printer/info
export interface PrinterInfo {
  state: "ready" | "error" | "shutdown" | "startup";
  state_message: string;
  hostname: string;
  software_version: string;
  cpu_info: string;
  klipper_path: string;
  python_path: string;
  log_file: string;
  config_file: string;
}

// Object query results from /printer/objects/query
export interface QueryResult {
  eventtime: number;
  status: Record<string, Record<string, unknown>>;
}

// Available objects from /printer/objects/list
export interface ObjectsList {
  objects: string[];
}

// GCode file info from /server/files/list?root=gcodes
export interface GCodeFileInfo {
  path: string;  // API returns 'path' for gcodes, not 'filename'
  modified: number;
  size: number;
  permissions: string;
}

// GCode metadata from /server/files/metadata
export interface GCodeMetadata {
  filename: string;
  size: number;
  modified: number;
  slicer?: string;
  slicer_version?: string;
  gcode_start_byte?: number;
  gcode_end_byte?: number;
  layer_count?: number;
  object_height?: number;
  estimated_time?: number;
  nozzle_diameter?: number;
  layer_height?: number;
  first_layer_height?: number;
  first_layer_extr_temp?: number;
  first_layer_bed_temp?: number;
  chamber_temp?: number;
  filament_name?: string;
  filament_type?: string;
  filament_total?: number;
  filament_weight_total?: number;
  thumbnails?: Array<{
    width: number;
    height: number;
    size: number;
    relative_path: string;
  }>;
}

// Job history entry
export interface JobHistoryEntry {
  job_id: string;
  exists: boolean;
  end_time: number;
  filament_used: number;
  filename: string;
  metadata: GCodeMetadata;
  print_duration: number;
  status: "completed" | "cancelled" | "error" | "klippy_shutdown" | "klippy_disconnect";
  start_time: number;
  total_duration: number;
}

// Job history totals
export interface JobHistoryTotals {
  total_jobs: number;
  total_time: number;
  total_print_time: number;
  total_filament_used: number;
  longest_job: number;
  longest_print: number;
}

// Job history result
export interface JobHistoryResult {
  count: number;
  jobs: JobHistoryEntry[];
}

// System info from /machine/system_info
export interface SystemInfo {
  cpu_info: {
    cpu_count: number;
    bits: string;
    processor: string;
    cpu_desc: string;
    serial_number: string;
    hardware_desc: string;
    model: string;
    total_memory: number;
    memory_units: string;
  };
  sd_info?: {
    manufacturer_id: string;
    manufacturer: string;
    oem_id: string;
    product_name: string;
    product_revision: string;
    serial_number: string;
    manufacturer_date: string;
    capacity: string;
    total_bytes: number;
  };
  distribution: {
    name: string;
    id: string;
    version: string;
    version_parts: {
      major: string;
      minor: string;
      build_number: string;
    };
    like: string;
    codename: string;
  };
  virtualization?: {
    virt_type: string;
    virt_identifier: string;
  };
  network: Record<string, {
    mac_address: string;
    ip_addresses: Array<{
      family: string;
      address: string;
      is_link_local: boolean;
    }>;
  }>;
  canbus?: Record<string, {
    tx_queue_len: number;
    bitrate: number;
    driver: string;
  }>;
  python?: {
    version: number[];
    version_string: string;
  };
}

// Process stats from /machine/proc_stats
export interface ProcStats {
  moonraker_stats: Array<{
    time: number;
    cpu_usage: number;
    memory: number;
    mem_units: string;
  }>;
  throttled_state: {
    bits: number;
    flags: string[];
  };
  cpu_temp: number;
  system_cpu_usage: {
    cpu: number;
    [key: string]: number;
  };
  system_memory: {
    total: number;
    available: number;
    used: number;
  };
  system_uptime: number;
  websocket_connections: number;
}
