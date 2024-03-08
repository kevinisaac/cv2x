import requests


url = 'CHECK YOUR SLACK MESSAGE FOR THE URL, PAUL'

interested_message = {
    "text": "🎉 Danny Torrence is interested in the exhibit demo and he might have booked a sales call with Kevin.",
    "blocks": [
    	{
    		"type": "section",
    		"text": {
    			"type": "mrkdwn",
    			"text": "🎉 Danny Torrence is interested. But don't worry. Kevin will probably screw up the sales call, so I'll let you know about the next one."
    		}
    	},
    	{
    		"type": "section",
    		"block_id": "section567",
    		"text": {
    			"type": "mrkdwn",
                "text": "Check <https://outreach.zephony.com/leads/23|Danny Torrence> out on Outreach.\n\nAnd update him on Instantly!\n\nIndustry: *Solar*"
    		},
    		"accessory": {
    			"type": "image",
    			"image_url": "https://res.cloudinary.com/teepublic/image/private/s--Vbbw3EO6--/t_Resized%20Artwork/c_fit,g_north_west,h_1054,w_1054/co_ffffff,e_outline:53/co_ffffff,e_outline:inner_fill:53/co_bbbbbb,e_outline:3:1000/c_mpad,g_center,h_1260,w_1260/b_rgb:eeeeee/c_limit,f_auto,h_630,q_auto:good:420,w_630/v1547152871/production/designs/3932294_0.jpg",
    			"alt_text": "Thumbs up image"
    		}
    	},
    ]
}

not_interested_message = {
    "text": "🙅 <https://outreach.zephony.com/leads/23|Danny Torrence> is not interested in our stuff.",
    "blocks": [
    	{
    		"type": "section",
    		"text": {
    			"type": "mrkdwn",
                "text": "🙅 <https://outreach.zephony.com/leads/23|Danny Torrence> is not interested in our stuff.",
    		}
    	},
    ]
}

later_message = {
    "text": "🫡 <https://outreach.zephony.com/leads/23|Danny Torrence> says \"Next Quarter\". Take note people!",
    "blocks": [
    	{
    		"type": "section",
    		"text": {
    			"type": "mrkdwn",
                "text": "🫡 <https://outreach.zephony.com/leads/23|Danny Torrence> says \"Next Quarter\". Take note people!",
    		}
    	},
    ]
}

requests.post(url, json=interested_message)

