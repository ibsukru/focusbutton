import React from "react";
import { FocusButton } from "@focusbutton/ui";

const App = () => {
  const handleExit = () => {
    // Send message to Swift to quit the app
    if (window.webkit?.messageHandlers?.focusApp) {
      window.webkit.messageHandlers.focusApp.postMessage({
        type: "quit",
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "white",
        color: "black",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <FocusButton />
        </div>
      </div>
    </div>
  );
};

export default App;
