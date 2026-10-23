"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { DeleteSkillFloat } from "./delete-float";
import { EditSkillFloat } from "./edit-float";
import { UploadSkillFloat } from "./upload-float";
import type { SkillRow } from "./types";

export const skillFloatKeys = {
  upload: "upload",
  edit: "edit",
  delete: "delete",
} as const;

export const skillFloats: FloatItem<SkillRow>[] = [
  {
    key: skillFloatKeys.upload,
    render: (props) => <UploadSkillFloat {...props} />,
  },
  {
    key: skillFloatKeys.edit,
    render: (props) => <EditSkillFloat {...props} />,
  },
  {
    key: skillFloatKeys.delete,
    render: (props) => <DeleteSkillFloat {...props} />,
  },
];
