export function createRtcController({ onRemoteStream, onSignal }) {
  const peers = new Map();
  let localStream = null;

  async function ensureLocalStream(constraints = { video: true, audio: true }) {
    if (localStream) return localStream;
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return localStream;
  }

  function setTrackEnabled(kind, enabled) {
    if (!localStream) return;
    for (const track of localStream.getTracks()) {
      if (track.kind === kind) track.enabled = enabled;
    }
  }

  async function createPeer(remoteUserId, isInitiator) {
    if (peers.has(remoteUserId)) return peers.get(remoteUserId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    const stream = await ensureLocalStream();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) onRemoteStream(remoteUserId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({ type: 'signal.ice', targetUserId: remoteUserId, payload: event.candidate });
      }
    };

    peers.set(remoteUserId, pc);

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      onSignal({ type: 'signal.offer', targetUserId: remoteUserId, payload: offer });
    }

    return pc;
  }

  async function onSignalOffer(fromUserId, offer) {
    const pc = await createPeer(fromUserId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    onSignal({ type: 'signal.answer', targetUserId: fromUserId, payload: answer });
  }

  async function onSignalAnswer(fromUserId, answer) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async function onSignalIce(fromUserId, candidate) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function removePeer(userId) {
    const pc = peers.get(userId);
    if (pc) pc.close();
    peers.delete(userId);
  }

  function closeAll() {
    for (const [userId, pc] of peers.entries()) {
      pc.close();
      peers.delete(userId);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
  }

  return {
    ensureLocalStream,
    setTrackEnabled,
    createPeer,
    onSignalOffer,
    onSignalAnswer,
    onSignalIce,
    removePeer,
    closeAll,
    getLocalStream: () => localStream
  };
}
