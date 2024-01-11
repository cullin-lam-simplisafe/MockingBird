import { useState, useRef, useEffect } from 'react'
import './App.css'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import WebCam from 'react-webcam'
function App() {
  const [poseLandmarkerReady, setPoseLandmarkerReady] = useState(false)
  const poseLandmarkerRef = useRef<PoseLandmarker>()
  const webCamRef = useRef<WebCam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [detectionRunning, setDetectionRunning] = useState(false)
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

  // Load media pipe api
  useEffect(() => {
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
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
  }, [])

  useEffect(() => {
    let id: number
    const canvasCtx = canvasRef.current?.getContext("2d")
    const drawingUtils = canvasCtx && new DrawingUtils(canvasCtx)
    function predictWebcam() {
      if (canvasRef.current && webCamRef.current?.video && poseLandmarkerRef.current && canvasCtx && drawingUtils) {
        const canvasElement = canvasRef.current
        const video = webCamRef.current.video
        const poseLandmarker = poseLandmarkerRef.current
        // Now let's start detecting the stream.
        const startTimeMs = performance.now();
        if (detectionRunning) {
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
          id = window.requestAnimationFrame(() => predictWebcam());
        }
      }
    }
    if (detectionRunning) {
      predictWebcam()
    } else {
      const canvasElement = canvasRef.current
      canvasElement && canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx?.save();

    }
    return () => {
      window.cancelAnimationFrame(id)
    }
  }, [detectionRunning])


  return (
    <div>
      <h1>MockingBird 🐦‍⬛</h1>
      <h2>Intruder deterrence 🚨 powered by Artificial Intelligence 🤖</h2>
      <p>Stand in front of your webcam to get real-time human detection.</p>
      <div id="liveView" className="videoView">
        <button onClick={() => setDetectionRunning(!detectionRunning)} disabled={!hasGetUserMedia() || !poseLandmarkerReady} id="webcamButton" className="mdc-button mdc-button--raised">
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">{detectionRunning ? "DISABLE DETECTION" : "ENABLE DETECTION"}</span>
        </button>
        <div style={{ position: 'relative' }}>
          <WebCam ref={webCamRef} id='webcam' style={{ width: "480px", height: "360px", position: 'absolute' }} />
          <canvas ref={canvasRef} className="output_canvas" id="output_canvas" width="480px" height="360px" style={{ position: 'absolute', left: "0px", top: '0px' }}></canvas>
        </div>
      </div>
    </div>
  )
}

export default App
