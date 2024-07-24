pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract VotingSystem {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    IERC721 public voteToken;
    mapping(uint256 => bool) public tokenUsed;
    Candidate[] public candidates;
    uint256 public votingEnd;

    event VoteCast(address voter, uint256 candidateIndex, uint256 tokenId);

    constructor(address _voteToken, string[] memory candidateNames, uint256 durationInMinutes) {
        voteToken = IERC721(_voteToken);
        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate({
                name: candidateNames[i],
                voteCount: 0
            }));
        }
        votingEnd = block.timestamp + (durationInMinutes * 1 minutes);
    }

    function vote(uint256 candidateIndex, uint256 tokenId) public {
        require(voteToken.ownerOf(tokenId) == msg.sender, "You don't own this voting token.");
        require(!tokenUsed[tokenId], "This token has already been used to vote.");
        require(candidateIndex < candidates.length, "Invalid candidate index.");
        require(block.timestamp < votingEnd, "Voting has ended.");

        tokenUsed[tokenId] = true;
        candidates[candidateIndex].voteCount++;

        emit VoteCast(msg.sender, candidateIndex, tokenId);
    }

    function getCandidateCount() public view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 index) public view returns (string memory, uint256) {
        require(index < candidates.length, "Invalid candidate index.");
        Candidate memory candidate = candidates[index];
        return (candidate.name, candidate.voteCount);
    }
}
