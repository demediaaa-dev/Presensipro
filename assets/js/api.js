const API_URL = "https://script.google.com/macros/s/AKfycbz-sqQbTA5-10_jndeHx_sToINGq1kipYsbnDXDM_JjDoPkhwoOW32XXCklyKK-Df3PHA/exec";

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
