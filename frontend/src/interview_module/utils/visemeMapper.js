import { RiTa } from 'rita';

const OCULUS_PHONEMES = {
  // Vowels
  'aa': 'viseme_aa', 'ae': 'viseme_aa', 'ah': 'viseme_aa',
  'ao': 'viseme_O',  'aw': 'viseme_O',  'ow': 'viseme_O',
  'uw': 'viseme_U',  'uh': 'viseme_U',
  'eh': 'viseme_E',  'ey': 'viseme_E',
  'ih': 'viseme_I',  'iy': 'viseme_I',  'ay': 'viseme_I',
  'er': 'viseme_RR',

  // Consonants
  'b': 'viseme_PP', 'p': 'viseme_PP', 'm': 'viseme_PP',
  'f': 'viseme_FF', 'v': 'viseme_FF',
  'th': 'viseme_TH', 'dh': 'viseme_TH',
  'ch': 'viseme_CH', 'sh': 'viseme_CH', 'zh': 'viseme_CH', 'jh': 'viseme_CH',
  't': 'viseme_DD', 'd': 'viseme_DD',
  'k': 'viseme_kk', 'g': 'viseme_kk',
  's': 'viseme_SS', 'z': 'viseme_SS',
  'r': 'viseme_RR',
  'l': 'viseme_nn', 'n': 'viseme_nn', 'ng': 'viseme_nn',
  'w': 'viseme_U',  'y': 'viseme_I',

  default: 'jawOpen',
};

export function textToVisemes(text) {
  const visemes = [];
  const tokens = text.toLowerCase().split(/([.,!?;:\-–—]+)/);

  tokens.forEach((token) => {
    if (/^[.,!?;:\-–—]+$/.test(token)) {
      if (visemes.length > 0 && visemes[visemes.length - 1] !== 'rest') {
        visemes.push('rest');
      }
      return;
    }

    // Word token — clean and look up phonemes
    const words = token.replace(/[^a-z\s]/g, '').split(/\s+/);

    words.forEach((word) => {
      if (!word) return;
      try {
        const phones = RiTa.phones(word).split('-');
        phones.forEach((phone) => {
          const cleanPhone = phone.replace(/[0-9]/g, '');
          const shape = OCULUS_PHONEMES[cleanPhone] ?? OCULUS_PHONEMES.default;

          // Prevent stuttering on consecutive identical shapes
          if (visemes.length === 0 || visemes[visemes.length - 1] !== shape) {
            visemes.push(shape);
          }
        });
      } catch (e) {
        visemes.push(OCULUS_PHONEMES.default);
      }
    });
  });

  return visemes;
}