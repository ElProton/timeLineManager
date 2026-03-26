export interface ProjectMetadata {
  title: string;
  musicName: string;
  durationSeconds: number;
}

export interface Actor {
  id: string;
  name: string;
}

export interface Action {
  id: string;
  description: string;
  timeStart: number;
  timeEnd: number;
  actorIds: string[];
  color: string;
}

export const CURRENT_SCHEMA_VERSION = 1;

export interface ProjectData {
  schemaVersion: number;
  metadata: ProjectMetadata;
  actors: Actor[];
  actions: Action[];
}
