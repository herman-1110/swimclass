// design/Main.dc.html .chips (:31, :39): as many 60 px columns as fit, 6 px apart; from
// 768 px, 84 px columns 8 px apart. 5 chips a row at 390 px, 4 at 360 (book.md C16).
export const CHIP_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-1.5 md:grid-cols-[repeat(auto-fill,minmax(84px,1fr))] md:gap-2'
