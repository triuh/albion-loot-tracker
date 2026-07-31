# 🚀 Деплой через GitHub + Netlify (авто-обновление)

## Шаг 1: Создать репозиторий на GitHub

1. Открой https://github.com/new
2. В поле **Repository name** напиши: `albion-loot-tracker`
3. Выбери **Public** (или Private — тоже работает)
4. **НЕ ставь** галочки "Add a README" и "Add .gitignore" (они уже есть)
5. Нажми **Create repository**

## Шаг 2: Залить код на GitHub

После создания репозитория GitHub покажет команды. Скопируй и вставь эти команды в терминал (CMD или PowerShell) в папке проекта:

```bash
cd E:\KimiData\kimi\workspace\albion-loot-tracker
git remote add origin https://github.com/ТВОЙ_НИК/albion-loot-tracker.git
git branch -M main
git push -u origin main
```

> Замени `ТВОЙ_НИК` на свой GitHub username!

## Шаг 3: Подключить Netlify

1. Открой https://app.netlify.com/
2. Нажми **Add new site → Import an existing project**
3. Выбери **GitHub** и авторизуйся
4. Найди репозиторий `albion-loot-tracker` и нажми на него
5. В настройках сборки укажи:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Нажми **Deploy site**

## Шаг 4: Готово! 🎉

Netlify автоматически:
- Соберёт проект
- Подключит функцию `albion-proxy` для работы с Albion API
- Выдаст URL типа `https://albion-loot-tracker-xxx.netlify.app`

## Как обновлять сайт

Просто меняй файлы локально и выполняй:

```bash
cd E:\KimiData\kimi\workspace\albion-loot-tracker
git add -A
git commit -m "Обновление"
git push
```

Netlify автоматически пересоберёт и обновит сайт за 1-2 минуты!
