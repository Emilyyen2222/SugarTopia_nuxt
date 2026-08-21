<script setup lang="ts">
// 對應 vanilla 版本 signup.html + auth.js 的 setupSignupForm()。
// .login-box.signup 在 CSS/login.css 裡是 padding: 40px、min-height: auto、
// form-group 間距比 login 版本緊一點（15px vs 20px），這裡對應用
// px-10 py-10（40px）跟 space-y-[15px]。

const { signup, user } = useAuth();
const { show } = useSiteMessage();
const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const agreedToTerms = ref(false);
const isSubmitting = ref(false);

onMounted(() => {
  if (user.value) {
    show(`You're already logged in as ${user.value.name}.`);
    router.push("/");
  }
});

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    show("Passwords do not match.");
    return;
  }

  if (!agreedToTerms.value) {
    show("Please agree to the terms first.");
    return;
  }

  isSubmitting.value = true;
  try {
    const newUser = await signup(name.value.trim(), email.value.trim(), password.value);
    show(`Welcome to SugarTopia, ${newUser.name}.`);
    router.push("/");
  } catch (error: any) {
    show(error?.data?.detail || "Request failed.");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="flex min-h-[calc(100vh-180px)] items-start justify-center px-5 pb-20 pt-24"
    style="background: linear-gradient(to right, #fff, #fcdc94 50%, #f9a726 50%)"
  >
    <div class="w-full max-w-[450px] rounded-[20px] bg-white px-10 py-10 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
      <h1 class="mb-2.5 text-center text-[28px] text-brand-brown">Create Account</h1>
      <p class="mb-[30px] text-center text-brand-brown">Join Sugar.Topia today</p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="mb-[15px]">
          <label for="name" class="mb-2 block font-medium text-brand-brown">Full Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Enter your full name"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-[15px]">
          <label for="email" class="mb-2 block font-medium text-brand-brown">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-[15px]">
          <label for="password" class="mb-2 block font-medium text-brand-brown">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Create a password"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-[15px]">
          <label for="confirm-password" class="mb-2 block font-medium text-brand-brown">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
            class="w-full rounded-lg border border-[#ddd] p-3 text-base text-brand-brown transition-colors focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div class="mb-5 flex items-center justify-between">
          <label class="flex items-center gap-2 text-brand-brown">
            <input v-model="agreedToTerms" type="checkbox" />
            <span class="text-sm leading-snug">I agree to the Terms of Service and Privacy Policy</span>
          </label>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-brand-orange py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-orange-dark disabled:cursor-wait disabled:opacity-65"
        >
          {{ isSubmitting ? "Creating account..." : "Sign Up" }}
        </button>

        <p class="mt-5 text-center text-brand-brown">
          Already have an account?
          <NuxtLink to="/login" class="font-medium text-brand-orange no-underline hover:underline">Log in</NuxtLink>
        </p>
      </form>
    </div>
  </main>
</template>
