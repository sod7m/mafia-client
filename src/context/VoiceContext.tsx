/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Room, RoomEvent, Track, type Participant, type RemoteTrack } from 'livekit-client'

export interface ParticipantMedia {
  identity: string
  videoTrack?: Track
  camOn: boolean
  micOn: boolean
  isSpeaking: boolean
}

// Who may subscribe to my published tracks: everyone, nobody, or a specific
// list of participant identities (used to keep night cameras secret).
export type VoiceVisibility = 'all' | 'none' | string[]

// The game's authoritative policy for the local player at this moment.
export interface GameAudioPolicy {
  allowMic: boolean // is the player allowed to talk right now (by phase/role)
  visibility: VoiceVisibility // who may see the player's camera
}

interface VoiceContextValue {
  connected: boolean
  media: Map<string, ParticipantMedia>
  micWanted: boolean // the user's own mic preference (button), not the effective state
  camWanted: boolean // the user's own camera preference (button)
  toggleMic: () => void
  toggleCam: () => void
  setGameAudioPolicy: (policy: GameAudioPolicy) => void
  error: string | null
}

const VoiceContext = createContext<VoiceContextValue>({
  connected: false,
  media: new Map(),
  micWanted: true,
  camWanted: false,
  toggleMic: () => {},
  toggleCam: () => {},
  setGameAudioPolicy: () => {},
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
  const [error, setError] = useState<string | null>(null)

  // The two independent inputs for the microphone:
  //  - userWantsMic: the player's own choice (button). A manual mute always wins.
  //  - allowMic: the game's permission for this phase/role.
  // The published microphone is the AND of both, recomputed reactively, so the
  // button can never open a window to talk when the game forbids it.
  const [userWantsMic, setUserWantsMic] = useState(true)
  const [userWantsCam, setUserWantsCam] = useState(false)
  const [allowMic, setAllowMic] = useState(false)
  const [visibility, setVisibility] = useState<VoiceVisibility>('all')

  useEffect(() => {
    if (!enabled || !url || !token) {
      return
    }

    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    let cancelled = false

    const rebuild = () => {
      if (!cancelled) setMedia(buildMedia(room))
    }

    const attachAudio = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
        audioContainerRef.current.appendChild(track.attach())
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
    }
  }, [enabled, url, token])

  // Effective microphone = game permission AND user's wish. Recomputed whenever
  // either changes — there is no imperative path that bypasses this.
  useEffect(() => {
    const localParticipant = roomRef.current?.localParticipant
    if (!connected || !localParticipant) return
    void localParticipant.setMicrophoneEnabled(allowMic && userWantsMic).catch(() => {})
  }, [connected, allowMic, userWantsMic])

  // Camera is controlled by the user only; the game never toggles it.
  useEffect(() => {
    const localParticipant = roomRef.current?.localParticipant
    if (!connected || !localParticipant) return
    void localParticipant.setCameraEnabled(userWantsCam).catch(() => setError('Немає доступу до камери'))
  }, [connected, userWantsCam])

  // Who may subscribe to my tracks. Applies to current and future tracks, so a
  // camera turned on during the night is never visible to unauthorized players.
  const visibilityKey = typeof visibility === 'string' ? visibility : visibility.join(',')
  useEffect(() => {
    const localParticipant = roomRef.current?.localParticipant
    if (!connected || !localParticipant) return
    if (visibility === 'all') {
      localParticipant.setTrackSubscriptionPermissions(true, [])
    } else if (visibility === 'none') {
      localParticipant.setTrackSubscriptionPermissions(false, [])
    } else {
      localParticipant.setTrackSubscriptionPermissions(
        false,
        visibility.map((identity) => ({ participantIdentity: identity, allowAll: true })),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, visibilityKey])

  const toggleMic = () => setUserWantsMic((current) => !current)
  const toggleCam = () => setUserWantsCam((current) => !current)

  const setGameAudioPolicy = useCallback((policy: GameAudioPolicy) => {
    setAllowMic(policy.allowMic)
    setVisibility(policy.visibility)
  }, [])

  return (
    <VoiceContext.Provider
      value={{ connected, media, micWanted: userWantsMic, camWanted: userWantsCam, toggleMic, toggleCam, setGameAudioPolicy, error }}
    >
      {children}
      <div ref={audioContainerRef} className="hidden" aria-hidden />
    </VoiceContext.Provider>
  )
}
