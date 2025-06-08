// Placeholder for custom types
// This will be properly implemented later.

export interface Family {
  id: string;
  name: string;
  parentIds: string[];
  childIds: string[];
}

export interface Preference {
  familyId: string;
  date: Date;
  canDrive: boolean;
}
