// Lightweight hand-crafted Lottie JSON – 3 bouncing dots
const makeDot = (ind: number, delay: number) => ({
  ddd: 0,
  ind,
  ty: 4,
  nm: `dot${ind}`,
  sr: 1,
  ks: {
    o: { a: 0, k: 100 },
    p: { a: 0, k: [30 + (ind - 1) * 30, 60, 0] },
    s: {
      a: 1,
      k: [
        { t: delay, s: [100, 100, 100] },
        { t: delay + 8, s: [100, 140, 100] },
        { t: delay + 16, s: [100, 100, 100] },
      ],
    },
    r: { a: 0, k: 0 },
    a: { a: 0, k: [0, 0, 0] },
  },
  shapes: [
    {
      ty: "el",
      d: 1,
      s: { a: 0, k: [14, 14] },
      p: { a: 0, k: [0, 0] },
      nm: "circle",
    },
    {
      ty: "fl",
      c: { a: 0, k: [0.55, 0.55, 0.6, 1] },
      o: { a: 0, k: 100 },
      r: 1,
    },
  ],
});

export const loadingDotsAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 30,
  w: 120,
  h: 120,
  nm: "loading-dots",
  ddd: 0,
  assets: [],
  layers: [makeDot(1, 0), makeDot(2, 5), makeDot(3, 10)],
};
