// Lightweight hand-crafted Lottie JSON – checkmark draw animation
export const successCheckAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 40,
  w: 120,
  h: 120,
  nm: "success-check",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "circle",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 10, s: [100] }] },
        p: { a: 0, k: [60, 60, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 15, s: [100, 100, 100] }] },
        r: { a: 0, k: 0 },
        a: { a: 0, k: [0, 0, 0] },
      },
      shapes: [
        {
          ty: "el",
          d: 1,
          s: { a: 0, k: [56, 56] },
          p: { a: 0, k: [0, 0] },
          nm: "bg",
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.22, 0.78, 0.45, 1] },
          o: { a: 0, k: 100 },
          r: 1,
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "check",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 12, s: [0] }, { t: 20, s: [100] }] },
        p: { a: 0, k: [60, 60, 0] },
        s: { a: 1, k: [{ t: 12, s: [0, 0, 100] }, { t: 25, s: [100, 100, 100] }] },
        r: { a: 0, k: 0 },
        a: { a: 0, k: [0, 0, 0] },
      },
      shapes: [
        {
          ty: "sh",
          d: 1,
          ks: {
            a: 0,
            k: {
              c: false,
              v: [[-10, 2], [-3, 9], [12, -8]],
              i: [[0, 0], [0, 0], [0, 0]],
              o: [[0, 0], [0, 0], [0, 0]],
            },
          },
          nm: "checkmark",
        },
        {
          ty: "st",
          c: { a: 0, k: [1, 1, 1, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 3 },
          lc: 2,
          lj: 2,
        },
        {
          ty: "tm",
          s: { a: 0, k: 0 },
          e: { a: 1, k: [{ t: 15, s: [0] }, { t: 30, s: [100] }] },
          o: { a: 0, k: 0 },
          nm: "draw",
        },
      ],
    },
  ],
};
