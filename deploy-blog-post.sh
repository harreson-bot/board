#!/bin/bash

# Deploy "Run Your Relationships Like Your Business" blog post to CalvennStarre.com
# Execute this from your local machine or DreamHost terminal

SSH_USER="cstarre"
SSH_HOST="vps48233.dreamhostps.com"
REMOTE_PATH="~/public_html/blog/"
LOCAL_FILE="/home/harreson/.openclaw/workspace/relationships-blog-post.html"
REMOTE_FILENAME="run-your-relationships-like-your-business.html"

echo "🚀 Deploying blog post to CalvennStarre.com..."
echo ""
echo "Host: $SSH_HOST"
echo "User: $SSH_USER"
echo "Destination: $REMOTE_PATH$REMOTE_FILENAME"
echo ""

# Copy the file to the remote server
scp -v "$LOCAL_FILE" "$SSH_USER@$SSH_HOST:$REMOTE_PATH$REMOTE_FILENAME"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Blog post deployed."
    echo ""
    echo "📝 Blog post is now live at:"
    echo "https://calvennstarre.com/blog/run-your-relationships-like-your-business.html"
    echo ""
    echo "Next step: Update blog/index.html to include this post in the blog listing"
else
    echo ""
    echo "❌ Deployment failed. Check SSH credentials."
    exit 1
fi
