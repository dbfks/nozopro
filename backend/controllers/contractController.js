import Contract, { computeInviteHash } from '../models/Contract.js';
import { randomBytes, randomUUID } from 'crypto';
import mongoose from 'mongoose';
const { isValidObjectId } = mongoose;

async function findContractByIdOrContractId(id) {
  if (isValidObjectId(id)) {
    const byMongo = await Contract.findById(id);
    if (byMongo) return byMongo;
  }
  return await Contract.findOne({ contractId: id });
}

// 초대 생성
export async function createInvite(req, res) {
  try {
    const { id } = req.params;
    let { invitee, role = 'EMPLOYEE', expiresAt, inviteeAddress, inviteeName } = req.body;

    if (!invitee) {
      invitee = { address: inviteeAddress, name: inviteeName || '' };
    }
    if (!invitee?.address) {
      return res.status(400).json({ error: 'invitee.address is required' });
    }

    const contract = await findContractByIdOrContractId(id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    // 상태 가드
    if (!['DRAFT', 'INVITED', 'ACCEPTED'].includes(contract.status)) {
      return res.status(409).json({ error: `Invalid status: ${contract.status}` });
    }

    // ✅ 기존 초대 만료 처리
    contract.invites.forEach(inv => {
      if (inv.status !== 'ACCEPTED') {
        inv.status = 'EXPIRED';
      }
    });

    const nonce = randomBytes(16).toString('hex');
    const invite = {
      id: randomUUID(),
      invitee,
      role,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      nonce,
      status: 'PENDING',
    };

    const baseContractId = contract.contractId || contract._id.toString();
    invite.inviteHash = computeInviteHash({
      contractId: baseContractId,
      invitee,
      role,
      nonce,
      expiresAt: invite.expiresAt,
    });

    contract.invites.push(invite);
    contract.status = 'INVITED';
    await contract.save();

    return res.json({
      contractId: contract._id,
      status: contract.status,
      invite,
      messageToSign: {
        contractId: baseContractId,
        inviteId: invite.id,
        inviteHash: invite.inviteHash,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// 초대 수락
export async function acceptInvite(req, res) {
  try {
    const { id } = req.params;
    const { inviteId } = req.body;
    if (!inviteId) return res.status(400).json({ error: 'inviteId is required' });

    const contract = await findContractByIdOrContractId(id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const invite = contract.invites.find((v) => v.id === inviteId);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      invite.status = 'EXPIRED';
      await contract.save();
      return res.status(410).json({ error: 'Invite expired' });
    }

    invite.acceptedAt = new Date();
    invite.status = 'ACCEPTED';

    contract.status = 'ACCEPTED';
    await contract.save();

    return res.json({ ok: true, contractId: contract._id, status: contract.status, invite });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
