const API_URL = "https://script.google.com/macros/s/AKfycbyds2oQYpUTLu7A87e3AaNmybIH-osLNwTBeiaN6wJ0whIbhXROTK7K6G_kXx-JlE25Zg/exec";

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
