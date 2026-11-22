# Coleta Enfermagem BPA (Boletim de Produção Ambulatorial)

Aplicativo mobile e web para enfermagem (SUS) com persistência offline-first, banco de dados em tempo real no **Firebase Firestore**, sincronização de backup no **Google Drive** e geração de relatórios oficiais em **PDF (BPA)** e **Excel/CSV**.

---

## ☁️ Dados do seu Google Cloud & Firebase

- **Google Cloud Project ID:** `gen-lang-client-0534978661`
- **Project Number:** `35060670589`
- **Banco de Dados Firestore:** `ai-studio-coletaenfermagem-c56d31ea-59a8-459d-8dee-f083b1858ffa`
- **Google OAuth Client ID:** `35060670589-brpj4fqnn0vtjbvjgvli707t722e79i3.apps.googleusercontent.com`
- **Escopos Ativos:** `drive.file`, `userinfo.profile`, `userinfo.email`

---

## 🚀 Passo a Passo: Publicar no seu GitHub

O repositório Git local já está inicializado e com o commit pronto no branch `main`. Para enviar para a sua conta GitHub:

1. Acesse o seu [GitHub](https://github.com/new) e crie um novo repositório com o nome:
   ```
   coleta-enfermagem-bpa
   ```
   *(Não marque a opção de adicionar README nem .gitignore, pois o projeto já possui)*

2. No seu terminal, vincule o repositório remoto e envie os arquivos:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO_GITHUB/coleta-enfermagem-bpa.git
   git push -u origin main
   ```

---

## 🌐 Conectar o GitHub no Google Cloud Console (Cloud Run)

Para que o Google Cloud compile e publique automaticamente o aplicativo a cada atualização no GitHub:

1. Acesse o Cloud Run no seu projeto:
   👉 **[Console Google Cloud - Cloud Run (gen-lang-client-0534978661)](https://console.cloud.google.com/run?project=gen-lang-client-0534978661)**

2. Clique no botão **"Criar serviço"** (ou *Create Service*).

3. Na seção de implantação, selecione:
   - **"Implantar continuamente novas revisões a partir de um repositório de código-fonte"** (Configurar com Cloud Build).

4. Clique em **"Configurar o Cloud Build"**:
   - **Provedor de repositório:** Selecione **GitHub**.
   - Conecte sua conta do GitHub e autorize o Google Cloud Build.
   - Selecione o repositório `coleta-enfermagem-bpa`.
   - **Branch:** `^main$`.
   - **Tipo de compilação:** Selecione **Dockerfile** (o projeto já inclui o `Dockerfile` otimizado).

5. Nas configurações do serviço:
   - **Nome do serviço:** `coleta-enfermagem-bpa`
   - **Região:** `us-west1` (ou a região de sua preferência)
   - **Autenticação:** Marque **"Permitir invocações não autenticadas"** para que os usuários possam acessar o app pelo navegador/celular.
   - **Porta:** 8080 (já configurada no Dockerfile).

6. Clique em **"Criar"**. O Google Cloud criará o trigger e fará o deploy do aplicativo com link HTTPS seguro!

---

## 📱 Gerar APK para Android (Google Play Store)

1. **Instalação Imediata (PWA)**:
   Abra a URL gerada no navegador Chrome do seu celular Android, clique nos três pontos (⋮) e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.

2. **Gerar APK Nativo com PWABuilder (Em 1 clique)**:
   - Acesse [pwabuilder.com](https://www.pwabuilder.com)
   - Cole a URL do aplicativo hospedado no Cloud Run.
   - Clique em **"Package for Android"** para baixar o pacote `.apk` ou `.aab` pronto para o **Google Play Console**.

3. **Gerar APK via Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Coleta Enfermagem" "br.gov.saude.coleta.enfermagem" --web-dir dist
   npm run build
   npx cap add android
   npx cap open android
   ```
