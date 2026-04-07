const API_URL = "https://script.google.com/macros/s/AKfycbxsiyC8fnoSeud_YOorskyTH34LqUoQmvu3MLsb5ruVUaf_akD8GWdyyC9zIm7cMxF6Ew/exec";

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
