const API_URL = "https://script.google.com/macros/s/AKfycbyfFjKdx2Ouj7ObNWJeClfmMFUhXuKa41l2gJ3SjbOUrt6YUDv4qBi3k6Qx1nWVrtj6OA/exec";

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
