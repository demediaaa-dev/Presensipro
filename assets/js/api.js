const API_URL = "https://script.google.com/macros/s/AKfycby5HgisQk6o1N-6BB6uP2Y-eKHdBHuEXzj3Jiwp2ZuobyZ37r72W3qpkVW9ul5JgEqqmA/exec";

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
