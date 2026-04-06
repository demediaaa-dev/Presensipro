const API_URL = "https://script.google.com/macros/s/AKfycbyxl2AGFGZboet98TMJeupLVJszGeRjXhOmxnASQU-CPyThnAONQ1X7UerJJCW7-qQ_Zg/exec";

const API = {
  async login(username, password) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          username: username,
          password: password
        })
      });
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return { success: false, message: "Gagal terhubung ke server" };
    }
  }
};