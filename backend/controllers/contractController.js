//controllers/contractController.js
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

    // 초대 수락 시 employee 정보 설정
    if (invite.role === 'EMPLOYEE' || invite.role === 'WORKER') {
      contract.employee = {
        address: invite.invitee.address.toLowerCase(),
        name: invite.invitee.name || ''
      };
    }

    contract.status = 'ACCEPTED';
    await contract.save();

    return res.json({ ok: true, contractId: contract._id, status: contract.status, invite });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// 초대 알림 조회 (근로자 주소로 대기 중인 초대 목록)
export async function getInviteNotifications(req, res) {
  try {
    const { address } = req.params;
    if (!address) return res.status(400).json({ error: 'address is required' });

    // 해당 주소로 보낸 초대 중 PENDING 상태인 것들 조회
    const contracts = await Contract.find({
      'invites.invitee.address': address.toLowerCase(),
      'invites.status': 'PENDING',
      'invites.expiresAt': { $gt: new Date() } // 만료되지 않은 것만
    }).select('title contractId employer employee docJson invites');

    const notifications = [];
    contracts.forEach(contract => {
      const pendingInvites = contract.invites.filter(invite => 
        invite.invitee.address.toLowerCase() === address.toLowerCase() && 
        invite.status === 'PENDING' &&
        (!invite.expiresAt || new Date(invite.expiresAt) > new Date())
      );

      pendingInvites.forEach(invite => {
        notifications.push({
          contractId: contract.contractId,
          contractTitle: contract.title,
          employer: contract.employer,
          inviteId: invite.id,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: contract.createdAt
        });
      });
    });

    return res.json({ notifications });
  } catch (e) {
    console.error('getInviteNotifications error:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}