/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Room, RoomEvent, Track, type Participant, type RemoteTrack } from 'livekit-client'

export interface ParticipantMedia {
  identity: string
  videoTrack?: Track
  camOn: boolean
  micOn: boolean
  isSpeaking: boolean
}

interface VoiceContextValue {
  connected: boolean
  media: Map<string, ParticipantMedia>
  micOn: boolean
  camOn: boolean
  toggleMic: () => void
  toggleCam: () => void
  error: string | null
}

const VoiceContext = createContext<VoiceContextValue>({
  connected: false,
  media: new Map(),
  micOn: false,
  camOn: false,
  toggleMic: () => {},
  toggleCam: () => {},
  error: null,
})

export function useVoice() {
  return useContext(VoiceContext)
}

// Rebuild the per-participant media snapshot from the current room state.
function buildMedia(room: Room): Map<string, ParticipantMedia> {
  const map = new Map<string, ParticipantMedia>()
  const participants: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()]
  for (const participant of participants) {
    const camPub = participant.getTrackPublication(Track.Source.Camera)
    const micPub = participant.getTrackPublication(Track.Source.Microphone)
    const camOn = !!camPub?.track && !camPub.isMuted
    map.set(participant.identity, {
      identity: participant.identity,
      videoTrack: camOn ? camPub?.track : undefined,
      camOn,
      micOn: !!micPub && !micPub.isMuted,
      isSpeaking: participant.isSpeaking,
    })
  }
  return map
}

interface VoiceProviderProps {
  url: string | null
  token: string | null
  enabled: boolean
  children: ReactNode
}

export function VoiceProvider({ url, token, enabled, children }: VoiceProviderProps) {
  const roomRef = useRef<Room | null>(null)
  const audioContainerRef = useRef<HTMLDivElement | null>(null)
  const [connected, setConnected] = useState(false)
  const [media, setMedia] = useState<Map<string, ParticipantMedia>>(new Map())
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !url || !token) {
      return
    }

    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    let cancelled = false

    const rebuild = () => {
      if (cancelled) return
      setMedia(buildMedia(room))
      setMicOn(room.localParticipant.isMicrophoneEnabled)
      setCamOn(room.localParticipant.isCameraEnabled)
    }

    const attachAudio = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
        const element = track.attach()
        audioContainerRef.current.appendChild(element)
      }
    }

    room
      .on(RoomEvent.Connected, () => {
        if (!cancelled) {
          setConnected(true)
          rebuild()
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setConnected(false)
      })
      .on(RoomEvent.TrackSubscribed, (track) => {
        attachAudio(track)
        rebuild()
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove())
        rebuild()
      })
      .on(RoomEvent.LocalTrackPublished, rebuild)
      .on(RoomEvent.LocalTrackUnpublished, rebuild)
      .on(RoomEvent.TrackMuted, rebuild)
      .on(RoomEvent.TrackUnmuted, rebuild)
      .on(RoomEvent.ParticipantConnected, rebuild)
      .on(RoomEvent.ParticipantDisconnected, rebuild)
      .on(RoomEvent.ActiveSpeakersChanged, rebuild)

    room.connect(url, token).catch((connectError) => {
      if (!cancelled) {
        setError(connectError instanceof Error ? connectError.message : 'Не вдалося підключити голосовий чат')
      }
    })

    return () => {
      cancelled = true
      roomRef.current = null
      void room.disconnect()
      setConnected(false)
      setMedia(new Map())
      setMicOn(false)
      setCamOn(false)
    }
  }, [enabled, url, token])

  const toggleMic = () => {
    const localParticipant = roomRef.current?.localParticipant
    if (!localParticipant) return
    void roomRef.current?.startAudio()
    localParticipant
      .setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)
      .catch(() => setError('Немає доступу до мікрофона'))
  }

  const toggleCam = () => {
    const localParticipant = roomRef.current?.localParticipant
    if (!localParticipant) return
    localParticipant
      .setCameraEnabled(!localParticipant.isCameraEnabled)
      .catch(() => setError('Немає доступу до камери'))
  }

  return (
    <VoiceContext.Provider value={{ connected, media, micOn, camOn, toggleMic, toggleCam, error }}>
      {children}
      <div ref={audioContainerRef} className="hidden" aria-hidden />
    </VoiceContext.Provider>
  )
}
