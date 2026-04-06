const API_URL = "https://script.google.com/macros/s/AKfycbwv54ina3OhwNg1dL3Xhmdx0gs_o7qj-jUUtFfAKSwyV2fpVXzamQN08BYVx3vzS9gH-A/exec";

const API = {
  async call(data) { // Diubah dari 'post' ke 'call' agar sinkron dengan app.js
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: "Gagal terhubung ke server" };
    }
  }
};
