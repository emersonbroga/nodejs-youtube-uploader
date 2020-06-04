const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const [, , image] = process.argv;

const { google } = require('googleapis');
const { generate } = require('./image');

dotenv.config();

const YOUTUBE_API_URL = 'https://www.googleapis.com/auth/youtube';
const client = process.env.YOUTUBE_CLIENT_ID;
const secret = process.env.YOUTUBE_CLIENT_SECRET;
const video_id = process.env.YOUTUBE_VIDEO_ID;
const channel_id = process.env.YOUTUBE_CHANNEL_ID;
const token_file = process.env.TOKEN_FILE;
const redirectUrl = process.env.REDIRECT_URL;
const stats_file = process.env.STATS_FILE;
const port = process.env.PORT;

const oauth2Client = new google.auth.OAuth2(client, secret, `${redirectUrl}:${port}`);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const saveToFile = function (data, file, cb) {
  const promiseCallback = (resolve, reject) => {
    const json = JSON.stringify(data, null, 2);
    fs.writeFile(file, json, function (err) {
      if (err) return reject(err);
      resolve(true);
    });
  };
  return new Promise(promiseCallback);
};

const readFromFile = function (file, cb) {
  const promiseCallback = (resolve, reject) => {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) return reject(err);
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    });
  };

  return new Promise(promiseCallback);
};

const getYoutubeClient = () => {
  const promiseCallback = async (resolve, reject) => {
    try {
      const { tokens } = await readFromFile(token_file);
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });
      resolve(youtube);
    } catch (error) {
      reject(error);
    }
  };
  return new Promise(promiseCallback);
};

const getSubscriberCount = () => {
  const promiseCallback = async (resolve, reject) => {
    try {
      const youtube = await getYoutubeClient();
      const channelResult = await youtube.channels.list({
        id: [channel_id],
        part: ['statistics'],
      });

      const result = channelResult.data.items[0];
      const subscriberCount = result.statistics.subscriberCount;
      resolve(subscriberCount);
    } catch (error) {
      reject(error);
    }
  };

  return new Promise(promiseCallback);
};

const updateThumbnail = (file) => {
  const promiseCallback = async (resolve, reject) => {
    try {
      const youtube = await getYoutubeClient();
      const thumbnailUpdate = await youtube.thumbnails.set({
        videoId: video_id,
        requestBody: {},
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(file),
        },
      });

      resolve(thumbnailUpdate);
    } catch (error) {
      reject(error);
    }
  };

  return new Promise(promiseCallback);
};

const getVideo = (video_id) => {
  const promiseCallback = async (resolve, reject) => {
    try {
      const youtube = await getYoutubeClient();
      const result = await youtube.videos.list({
        id: video_id,
        part: 'statistics,snippet',
      });
      const video = result.data.items[0];
      resolve(video);
    } catch (error) {
      reject(error);
    }
  };

  return new Promise(promiseCallback);
};

const updateTitle = (video_id, title, categoryId, description) => {
  const promiseCallback = async (resolve, reject) => {
    try {
      const youtube = await getYoutubeClient();
      const updateResult = await youtube.videos.update({
        requestBody: {
          id: video_id,
          snippet: {
            title,
            categoryId,
            description,
          },
        },
        part: 'snippet',
      });
      resolve(updateResult);
    } catch (error) {
      reject(error);
    }
  };

  return new Promise(promiseCallback);
};

async function updateVideo() {
  try {
    console.log('Updating video...');
    // const subscriberCount = await getSubscriberCount();
    // console.log('Got Subscriber count', subscriberCount);
    const video = await getVideo(video_id);
    console.log('Got video: ', video.snippet.title);
    const categoryId = video.snippet.categoryId;
    const description = video.snippet.description;
    const { viewCount, likeCount, dislikeCount } = video.statistics;
    const stats = await readFromFile(stats_file);
    if (stats.viewCount === viewCount && stats.likeCount === likeCount) {
      console.log('Stats didnt change: ', viewCount, likeCount);
      return;
    }
    await saveToFile({ viewCount, likeCount }, stats_file);

    const newTitle = `O que é API? Esse video tem ${likeCount} likes e ${viewCount} views!`;
    const result = await updateTitle(video_id, newTitle, categoryId, description);
    console.log('Title updated: ', newTitle);
    const thumbnail = await generate(likeCount);
    console.log('Generated thumbnail: ', thumbnail.file);
    const thumnailUpdate = await updateThumbnail(thumbnail.file);
    console.log('Thumbnail updated: ', thumbnail.file);

    return result;
  } catch (error) {
    console.log('Error updating video');
    console.log(error);
  }
}

// OAuth Code
app.get('/', async (req, res) => {
  const { code } = req.query;
  if (code) {
    const tokens = await oauth2Client.getToken(code);

    const stored = await saveToFile(tokens, token_file);
    const stats_stored = await saveToFile({ viewCount: 0, likeCount: 0 }, stats_file);
    const message = stored ? 'Success! Token stored successfully' : 'Failed!';
    return res.json({ message });
  }

  const scopes = ['profile', 'email', YOUTUBE_API_URL];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  return res.redirect(url);
});

if (image) {
  updateVideo();
} else {
  app.listen(port, () => {
    console.log('Listening on: ', `${redirectUrl}:${port}`);
  });
}
