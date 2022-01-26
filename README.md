# use-trtc

腾讯云视频通话hook

### 使用方法

``` tsx
const {join, leave, localStream, remoteStreams, joinState, handleMuteToggle} = useTRtc();

// 发起通话
const hangOnVideo = async () => {
  if (joinState) return;
  const { sdkAppId, userSig} = genTestUserSig('aaa');
  await join(999, {
    mode: 'rtc',
    sdkAppId,
    userSig,
    userId: 'aaa',
  }, {
    userId: 'aaa',
    audio: true,
    video: true
  });
};

// 结束通话
const hangUpVideo = async () => {
  await leave();
};
  
```
