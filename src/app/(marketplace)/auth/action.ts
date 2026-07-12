"use server";

export async function verifyTurnstileToken(token: string) {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { success: false, error: "Cloudflare Secret Key tidak dikonfigurasi." };
  }

  try {
    // Kirim request verifikasi ke API Cloudflare
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: "Verifikasi Turnstile gagal atau token kedaluwarsa." };
    }
  } catch (error) {
    console.error("Turnstile error:", error);
    return { success: false, error: "Gagal menghubungi server verifikasi Cloudflare." };
  }
}