import { apiRequest } from "./client";

type BackupMeta = {
  userId?: string;
  [key: string]: unknown;
};

export type UserBackup = {
  meta: BackupMeta;
  data: unknown;
};

export const exportUserBackup = () =>
  apiRequest<UserBackup>({
    url: "/api/user/backup/export",
    method: "GET",
  });

export const importUserBackup = (payload: UserBackup) =>
  apiRequest<void>({
    url: "/api/user/backup/import",
    method: "POST",
    data: payload,
  });
