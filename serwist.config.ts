import { serwist } from '@serwist/next/config';

export default serwist({
  swDest: 'public/sw.js',
  swSrc: 'src/sw.ts',
});
