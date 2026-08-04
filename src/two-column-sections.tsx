import * as React from "react";

export interface TwoColumnSectionsProps {
  columnOne: React.ReactNode;
  columnTwo: React.ReactNode;
}

export function TwoColumnSections({
  columnOne,
  columnTwo,
}: TwoColumnSectionsProps) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      <div className="flex flex-1 flex-col gap-5">{columnOne}</div>
      <div className="flex flex-1 flex-col gap-5">{columnTwo}</div>
    </div>
  );
}
