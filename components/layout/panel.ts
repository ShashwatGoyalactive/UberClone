/**
 * Turns a map screen's bottom sheet into the floating panel of the desktop
 * layout ("Desktop · …" artboards): from 768px it sits top-left, 400px
 * wide, scrolling inside itself. Add to the sheet's className; add
 * SHEET_HANDLE to its drag handle so the handle hides on desktop.
 */
export const DESKTOP_PANEL =
  "md:inset-x-auto md:bottom-auto md:left-6 md:top-6 md:w-[400px] md:max-h-[calc(100%-3rem)] md:overflow-y-auto md:rounded-3xl md:shadow-float";

export const SHEET_HANDLE = "md:hidden";

/** Desktop width taken by the panel and its margins, for map framing. */
export const DESKTOP_PANEL_INSET_PX = 24 + 400 + 24;
