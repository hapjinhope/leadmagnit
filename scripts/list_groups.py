#!/usr/bin/env python3
"""
Authenticate a Telegram account and list group/supergroup chat IDs.
Requires api_id/api_hash from https://my.telegram.org and phone number of the account.
"""
import asyncio
import getpass
from typing import List, Tuple

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.tl.types import Channel, Chat


def normalize_chat_id(entity) -> str:
    if isinstance(entity, Channel):
        # Channel/supergroup ids use -100 prefix
        return f"-100{entity.id}"
    if isinstance(entity, Chat):
        # Basic group ids are negative
        return str(entity.id if entity.id < 0 else -abs(entity.id))
    return str(getattr(entity, "id", ""))


async def main():
    api_id = int(input("api_id (my.telegram.org): ").strip())
    api_hash = input("api_hash (my.telegram.org): ").strip()
    phone = input("phone (+7999...): ").strip()

    client = TelegramClient("tg_groups_session", api_id, api_hash)
    await client.connect()

    if not await client.is_user_authorized():
        await client.send_code_request(phone)
        code = input("Code from Telegram: ").strip()
        try:
            await client.sign_in(phone, code)
        except SessionPasswordNeededError:
            pwd = getpass.getpass("2FA password: ")
            await client.sign_in(password=pwd)

    dialogs = await client.get_dialogs()
    groups: List[Tuple[str, str]] = []
    for d in dialogs:
        ent = d.entity
        if isinstance(ent, (Channel, Chat)):
            title = getattr(ent, "title", getattr(ent, "username", "")) or str(ent.id)
            groups.append((normalize_chat_id(ent), title))

    groups = sorted(groups, key=lambda x: x[1].lower())
    print("\n== Groups/Supergroups ==")
    for gid, title in groups:
        print(f"{gid}\t{title}")


if __name__ == "__main__":
    asyncio.run(main())
