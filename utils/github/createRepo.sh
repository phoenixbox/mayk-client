# GIT REMOTE URL: git@github.com:phoenixbox/mayk-phoenixbox.git
GIT_REMOTE_URL=git@github.com:$USER/$GIT_PATH/$REPO
echo "--"
echo "-- Initializing local repo & pushing to remote"
echo "--"
touch .gitignore
git init
git add .
git commit -m 'initial commit'
git push --all $GIT_REMOTE_URL
git remote add origin $GIT_REMOTE_URL
git config branch.master.remote origin
git config branch.master.merge refs/heads/master
git fetch
git merge master
git branch -a

echo "--"
echo "-- Your new git repo '$REPO' is ready and initialized at:"
echo "-- $USER@$HOST/$GIT_PATH/$REPO"
echo "--"
