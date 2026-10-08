
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authToggle = document.getElementById("authToggle");
const logoutButton = document.getElementById("logoutButton");

let isRegisterMode = false;

function showAuthMessage(message) {
    authMessage.textContent = message;
}

function showLoginScreen() {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
}

function showAppScreen() {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
}

authToggle.addEventListener("click", () => {
    isRegisterMode = !isRegisterMode;

    authToggle.textContent = isRegisterMode
        ? "Já tenho uma conta"
        : "Criar uma conta";

    showAuthMessage(
        isRegisterMode
            ? "Crie sua conta para começar."
            : "Entre na sua conta."
    );
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = authEmail.value.trim();
    const password = authPassword.value;

    showAuthMessage("Aguarde...");

    try {
        if (isRegisterMode) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            if (!data.session) {
                showAuthMessage(
                    "Cadastro realizado! Confirme seu e-mail antes de entrar."
                );
            } else {
                showAuthMessage("Conta criada com sucesso!");
            }
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            showAuthMessage("Login realizado!");
        }
    } catch (error) {
        showAuthMessage(error.message);
    }
});

logoutButton.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Erro ao sair: " + error.message);
    }
});
