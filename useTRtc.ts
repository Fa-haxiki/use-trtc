import {useEffect, useState} from "react";
import {Client, ClientConfig, ClientEventMap, LocalStream, RemoteStream, StreamConfig} from "./trtc";
import TRTC from "trtc-js-sdk";

export type TMediaStream<Stream> = {
  stream: Stream;
  hasAudio?: boolean;
  hasVideo?: boolean;
};

export function useTRtc() {
  const [client, setClient] = useState<Client>();
  const [localStream, setLocalStream] = useState<TMediaStream<LocalStream>>();
  const [remoteStreams, setRemoteStreams] = useState<TMediaStream<RemoteStream>[]>([]);
  const [joinState, setJoinState] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  function createClient(config: ClientConfig) {
    const _client = TRTC.createClient(config);
    setClient(_client);
    return _client;
  }

  function createLocalStream(config: StreamConfig): LocalStream {
    return TRTC.createStream(config);
  }

  async function join(roomId: string | number, clientConfig: ClientConfig, streamConfig: StreamConfig) {
    if (initLoading) return;
    setInitLoading(true);
    const _client = createClient(clientConfig);
    await _client.join({roomId});
    const _localStream = createLocalStream(streamConfig);
    await _localStream.initialize();
    console.log('是否有声音', _localStream.hasAudio(), 'hasVideo', _localStream.hasVideo());
    setLocalStream({
      stream: _localStream,
      hasAudio: _localStream.hasAudio(),
      hasVideo: _localStream.hasVideo(),
    });
    console.log('初始化本地流成功');
    await _client.publish(_localStream);
    console.log('本地流发布成功');
    setJoinState(true);
    setInitLoading(false);
  }

  async function leave(cb?: Function) {
    if (client && localStream?.stream) {
      await client.unpublish(localStream.stream as LocalStream);
      localStream.stream.stop();
      localStream.stream.close();
      await client.leave();
      setRemoteStreams([]);
      setJoinState(false);
      cb?.();
    }
  }

  function handleMuteToggle(device: 'audio' | 'video') {
    switch (device) {
      case "audio":
        if (localStream) {
          if (localStream?.hasAudio) {
            localStream.stream.muteAudio();
            setLocalStream({
              ...localStream,
              hasAudio: false,
            });
          } else {
            localStream.stream.unmuteAudio();
            setLocalStream({
              ...localStream,
              hasAudio: true,
            });
          }
        }
        break;
      case "video":
        if (localStream) {
          if (localStream?.hasVideo) {
            localStream.stream.muteVideo();
            setLocalStream({
              ...localStream,
              hasVideo: false,
            });
          } else {
            localStream.stream.unmuteVideo();
            setLocalStream({
              ...localStream,
              hasVideo: true,
            });
          }
        }
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    const handleStreamAdded = (event: ClientEventMap["stream-added"]) => {
      console.log('远端流增加: ' + event.stream.getId());
      client?.subscribe(event.stream);
    };

    const handleStreamSubscribed = (event: ClientEventMap["stream-subscribed"]) => {
      console.log('远端流订阅成功：' + event.stream.getId());
      setRemoteStreams(preList => [
        ...(preList || []),
        {
          stream: event.stream,
          hasAudio: event.stream.hasAudio(),
          hasVideo: event.stream.hasVideo(),
        }
      ]);
    };

    const handleStreamRemoved = (event: ClientEventMap["stream-removed"]) => {
      setRemoteStreams(preList => {
        const index = preList.findIndex(item => {
          return item.stream.getUserId() === event.stream.getUserId()
        });
        if (index !== -1) {
          preList.splice(index, 1);
          console.log('远端流删除成功：' + event.stream.getId());
          return [...preList];
        }
        return [...preList];
      })
    };

    const handleMuteAudio = (event: ClientEventMap["mute-audio"]) => {
      setRemoteStreams(preList => preList.map(item => item.stream.getUserId() === event.userId ? {
        ...item,
        hasAudio: false,
      } : item));
    };

    const handleMuteVideo = (event: ClientEventMap["mute-video"]) => {
      setRemoteStreams(preList => preList.map(item => item.stream.getUserId() === event.userId ? {
        ...item,
        hasVideo: false,
      } : item));
    };

    const handleUnMuteAudio = (event: ClientEventMap["unmute-audio"]) => {
      setRemoteStreams(preList => preList.map(item => item.stream.getUserId() === event.userId ? {
        ...item,
        hasAudio: true,
      } : item));
    };

    const handleUnMuteVideo = (event: ClientEventMap["unmute-video"]) => {
      setRemoteStreams(preList => preList.map(item => item.stream.getUserId() === event.userId ? {
        ...item,
        hasVideo: true,
      } : item));
    };

    client?.on('stream-added', handleStreamAdded);
    client?.on('stream-subscribed', handleStreamSubscribed);
    client?.on('stream-removed', handleStreamRemoved);
    client?.on('mute-audio', handleMuteAudio);
    client?.on('mute-video', handleMuteVideo);
    client?.on('unmute-audio', handleUnMuteAudio);
    client?.on('unmute-video', handleUnMuteVideo);

    return () => {
      client?.off('stream-added', handleStreamAdded);
      client?.off('stream-subscribed', handleStreamSubscribed);
      client?.off('stream-removed', handleStreamRemoved);
      client?.off('mute-audio', handleMuteAudio);
      client?.off('mute-video', handleMuteVideo);
      client?.off('unmute-audio', handleUnMuteAudio);
      client?.off('unmute-video', handleUnMuteVideo);
    };
  }, [client, joinState]);

  return {
    client,
    localStream,
    remoteStreams,
    joinState,
    join,
    leave,
    handleMuteToggle,
  };
}