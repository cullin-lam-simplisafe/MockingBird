import { useState, useRef, useEffect, useMemo } from 'react'
import './App.css'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

function App() {
  const [poseLandmarkerReady, setPoseLandmarkerReady] = useState(false)
  const poseLandmarkerRef = useRef<PoseLandmarker>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webcamRunning, setWebcamRunning] = useState(false)
  const lastVideoStartTimeRef = useRef(-1)
  const canvasCtx = useMemo(() =>   canvasRef.current?.getContext("2d"),[canvasRef.current])
  const drawingUtils = useMemo(() => canvasCtx ? new DrawingUtils(canvasCtx): null,[canvasCtx]) 
  // Load media pipe api
  useEffect( () => {
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    ).then(async (vision) => {
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 2
      });
    })
    setPoseLandmarkerReady(true)
  },[])

  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

  async function predictWebcam() {
    if(webcamRunning && canvasRef.current && videoRef.current && poseLandmarkerRef.current && canvasCtx && drawingUtils) {
      const canvasElement = canvasRef.current
      const video = videoRef.current
      const poseLandmarker = poseLandmarkerRef.current

      // canvasElement.style.height = videoHeight;
      // video.style.height = videoHeight;
      // canvasElement.style.width = videoWidth;
      // video.style.width = videoWidth;
      // Now let's start detecting the stream.
      const startTimeMs = performance.now();
      if (lastVideoStartTimeRef.current !== video.currentTime) {
        lastVideoStartTimeRef.current = video.currentTime;
        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
          }
          canvasCtx.restore();
        });
      }
    
      // Call this function again to keep predicting when the browser is ready.
      if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
      }
    }
  }

  function enableCam(_event) {
    if (!poseLandmarkerRef.current) {
      console.log("Wait! poseLandmaker not loaded yet.");
      return;
    }

    setWebcamRunning(!webcamRunning)
  
    // getUsermedia parameters.
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      if(videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      }
    });
  }

  // ! TODO: create a second button to control starting / stopping pose detection 

  return (
    <div>
  <h1>MockingBird 🐦‍⬛</h1>
    <h2>Intruder deterrence 🚨 powered by Artificial Intelligence 🤖</h2>
    <p>Stand in front of your webcam to get real-time human detection.</p>

        <div id="liveView" className="videoView">
        <button onClick={enableCam} disabled={!hasGetUserMedia()} id="webcamButton" className="mdc-button mdc-button--raised">
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">{webcamRunning ? "DISABLE WEBCAM" : "ENABLE WEBCAM"}</span>
        </button>
        <div style={{position: 'relative'}}>
          <video ref={videoRef} id="webcam" style={{width: "480px", height: "360px", position: 'absolute'}} autoPlay playsInline></video>
          <canvas ref={canvasRef} className="output_canvas" id="output_canvas" width="480px" height="360px" style={{position: 'absolute', left:"0px", top:'0px'}}></canvas>
      </div>
    </div>
    </div>
  )
}

export default App
