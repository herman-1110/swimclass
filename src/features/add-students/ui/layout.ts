// The form's grid (AdminAddStudents.dc.html:31-36), shared by the form and its loading
// state so nothing moves when the data arrives. Phones: form, preview and buttons in one
// column, 28 px apart. From 768 px the same, up to 600 px wide (DESIGN §5). From 1024 px
// the form (up to 600 px) and the 320 px preview side by side, 48 px apart, the preview
// spanning both rows ("form preview" / "actions preview"), rows 26 px apart, left-aligned.
// Below 1024 px the sticky tab bar covers the bottom 73 px of the screen, so a control that
// takes focus (Tab, or an error) scrolls 96 px clear of the bottom (the spec §2.5).
export const GRID =
  'grid grid-cols-1 gap-y-7 md:max-w-150 lg:max-w-none lg:grid-cols-[minmax(0,600px)_320px] lg:items-start lg:gap-x-12 lg:gap-y-6.5 max-lg:[&_:is(input,select,button,a)]:scroll-mb-24'

/** The form column: its blocks 22 px apart, as drawn (off the 8 px grid, the spec §3). */
export const FORM_AREA = 'flex min-w-0 flex-col gap-5.5 lg:col-start-1 lg:row-start-1'

/** The preview, top right from 1024 px. */
export const PREVIEW_AREA = 'lg:col-start-2 lg:row-span-2 lg:row-start-1'

/** The buttons, under the form from 1024 px. */
export const ACTIONS_AREA = 'flex flex-col gap-3 lg:col-start-1 lg:row-start-2'
