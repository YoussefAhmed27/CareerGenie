let sharedStream = null;

export async function getSharedMediaStream() {
  if (!sharedStream) {
    sharedStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
  }
  return sharedStream;
}
