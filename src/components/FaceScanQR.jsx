import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://192.168.1.21:5001/api/qr/generate";

const FaceScanQR = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const printRef = useRef(null);

  const [status, setStatus] = useState("Ready to scan");
  const [loading, setLoading] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [user, setUser] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        setCameraReady(true);
      };
    } catch (err) {
      setStatus("❌ Camera access denied");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

  const scanFace = async () => {
    setLoading(true);
    setStatus("🔍 Scanning face...");
    setQrImage(null);
    setUser(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("face_image", blob, "face.jpg");

      try {
        const res = await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          const qrImg = res.data.data.qr_image;
          const userData = res.data.data.user;

          setQrImage(qrImg);
          setUser(userData);
          setStatus("✅ QR Generated Successfully");

          // Auto print after 500ms delay
          setTimeout(() => {
            printSlip(qrImg, userData);
          }, 500);
        } else {
          setStatus(res.data.message || "❌ Failed to generate QR");
        }
      } catch (err) {
        setStatus(err.response?.data?.message || "❌ Face not recognized");
      }

      setLoading(false);
    }, "image/jpeg");
  };

  const printSlip = (qrImg, userData) => {
    const printWindow = window.open("", "", "width=300,height=600");

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Food Slip</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .header h2 {
            margin: 5px 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            font-size: 11px;
          }
          .qr-section {
            text-align: center;
            margin: 15px 0;
          }
          .qr-section img {
            width: 150px;
            height: 150px;
            border: 2px solid #000;
          }
          .user-info {
            margin: 10px 0;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
          .user-info div {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 3px 0;
          }
          .user-info .label {
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 10px;
          }
          .timestamp {
            text-align: center;
            font-size: 10px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🍽️ FOOD SERVICE</h2>
          <p>Meal Token</p>
        </div>
        
        <div class="qr-section">
          <img src="${qrImg}" alt="QR Code" />
        </div>
        
        <div class="user-info">
          <div>
            <span class="label">NAME:</span>
            <span>${userData.name}</span>
          </div>
          <div>
            <span class="label">MOBILE:</span>
            <span>${userData.mobile}</span>
          </div>
          <div>
            <span class="label">ROLE:</span>
            <span>${userData.role}</span>
          </div>
        </div>
        
        <div class="timestamp">
          Generated: ${new Date().toLocaleString()}
        </div>
        
        <div class="footer">
          <p>Please present this slip at the counter</p>
          <p>Thank you!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🍽️ Food Face Scan</h1>
          <p style={styles.subtitle}>Scan your face to generate meal token</p>
        </div>

        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />

          <div style={styles.videoOverlay}>
            <div style={styles.scanFrame}></div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={styles.statusBar}>
          <span
            style={{
              ...styles.statusText,
              color: loading ? "#f59e0b" : qrImage ? "#10b981" : "#6b7280",
            }}
          >
            {status}
          </span>
        </div>

        <button
          onClick={scanFace}
          disabled={loading || !cameraReady}
          style={{
            ...styles.button,
            opacity: loading || !cameraReady ? 0.6 : 1,
            cursor: loading || !cameraReady ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>
              Scanning...
            </>
          ) : (
            <>📸 Scan Face</>
          )}
        </button>

        {qrImage && user && (
          <div style={styles.resultCard}>
            <div style={styles.qrContainer}>
              <img src={qrImage} alt="QR Code" style={styles.qrImage} />
            </div>

            <div style={styles.userDetails}>
              <div style={styles.userRow}>
                <span style={styles.userLabel}>👤 Name:</span>
                <span style={styles.userValue}>{user.name}</span>
              </div>
              <div style={styles.userRow}>
                <span style={styles.userLabel}>📱 Mobile:</span>
                <span style={styles.userValue}>{user.mobile}</span>
              </div>
              <div style={styles.userRow}>
                <span style={styles.userLabel}>💼 Role:</span>
                <span style={styles.userValue}>{user.role}</span>
              </div>
            </div>

            <button
              onClick={() => printSlip(qrImage, user)}
              style={styles.printButton}
            >
              🖨️ Print Again
            </button>
          </div>
        )}
      </div>

      <div ref={printRef} style={{ display: "none" }}></div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  header: {
    textAlign: "center",
    marginBottom: "25px",
  },
  title: {
    fontSize: "28px",
    margin: "0 0 8px 0",
    color: "#1f2937",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  videoContainer: {
    position: "relative",
    width: "100%",
    borderRadius: "15px",
    overflow: "hidden",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  video: {
    width: "100%",
    display: "block",
    borderRadius: "15px",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  scanFrame: {
    width: "200px",
    height: "250px",
    border: "3px solid #fff",
    borderRadius: "15px",
    boxShadow: "0 0 0 2000px rgba(0,0,0,0.3)",
  },
  statusBar: {
    textAlign: "center",
    padding: "12px",
    background: "#f9fafb",
    borderRadius: "10px",
    marginBottom: "15px",
  },
  statusText: {
    fontSize: "14px",
    fontWeight: "600",
  },
  button: {
    width: "100%",
    padding: "16px",
    fontSize: "18px",
    fontWeight: "600",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #ffffff",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  resultCard: {
    marginTop: "25px",
    padding: "20px",
    background: "#f0fdf4",
    borderRadius: "15px",
    border: "2px solid #10b981",
  },
  qrContainer: {
    textAlign: "center",
    marginBottom: "20px",
  },
  qrImage: {
    width: "180px",
    height: "180px",
    border: "3px solid #10b981",
    borderRadius: "10px",
    padding: "10px",
    background: "white",
  },
  userDetails: {
    marginBottom: "15px",
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px",
    background: "white",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  userLabel: {
    fontWeight: "600",
    color: "#374151",
  },
  userValue: {
    color: "#1f2937",
    fontWeight: "500",
  },
  printButton: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "10px",
    background: "#10b981",
    color: "white",
    cursor: "pointer",
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default FaceScanQR;
