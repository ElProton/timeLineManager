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

export interface ProjectData {
  metadata: ProjectMetadata;
  actors: Actor[];
  actions: Action[];
}
